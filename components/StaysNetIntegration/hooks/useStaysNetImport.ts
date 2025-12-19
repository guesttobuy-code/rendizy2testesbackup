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
} from '../types';

export interface UseStaysNetImportReturn extends ImportStateExtended {
  fetchProperties: (config: StaysNetConfig) => Promise<void>;
  importProperties: (config: StaysNetConfig, options: ImportOptions) => Promise<void>;
  importReservations: (config: StaysNetConfig, options: ImportOptions) => Promise<void>;
  importGuests: (config: StaysNetConfig) => Promise<void>;
  importAll: (config: StaysNetConfig, options: ImportOptions) => Promise<void>;
  importOneForTest: (config: StaysNetConfig) => Promise<void>;
  toggleProperty: (propertyId: string) => void;
  selectAllProperties: () => void;
  deselectAllProperties: () => void;
  resetImport: () => void;
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
  | { type: 'UPDATE_PROGRESS'; payload: { progress: ImportProgressData; overallProgress: number } };

interface ImportStateExtended extends ImportState {
  availableProperties: StaysNetProperty[];
  selectedPropertyIds: string[];
  loadingProperties: boolean;
  propertiesError: string | null;
  importProgress: ImportProgressData;
  overallProgress: number;
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
};

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

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        importProgress: action.payload.progress,
        overallProgress: action.payload.overallProgress,
      };

    default:
      return state;
  }
}

export function useStaysNetImport(): UseStaysNetImportReturn {
  const [state, dispatch] = useReducer(importReducer, initialState);

  /**
   * Fetch available properties
   */
  const fetchProperties = useCallback(async (config: StaysNetConfig) => {
    staysnetLogger.properties.info('Buscando propriedades disponíveis...');
    dispatch({ type: 'FETCH_PROPERTIES_START' });

    try {
      const properties = await StaysNetService.fetchAllProperties(config);
      dispatch({ type: 'FETCH_PROPERTIES_SUCCESS', payload: properties });
      staysnetLogger.properties.success(`${properties.length} propriedades carregadas`);
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch({ type: 'FETCH_PROPERTIES_ERROR', payload: errorMessage });
      staysnetLogger.properties.error('Erro ao buscar propriedades', error);
    }
  }, []);

  /**
   * Import properties
   */
  const importProperties = useCallback(
    async (config: StaysNetConfig, options: ImportOptions) => {
      staysnetLogger.import.info('Iniciando importação de propriedades...');
      dispatch({ type: 'START_IMPORT', payload: 'properties' });

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
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });
        throw error;
      }
    },
    []
  );

  /**
   * Import reservations
   */
  const importReservations = useCallback(
    async (config: StaysNetConfig, options: ImportOptions) => {
      staysnetLogger.import.info('Iniciando importação de reservas...');
      dispatch({ type: 'START_IMPORT', payload: 'reservations' });

      try {
        // Validate
        const validation = validateImportOptions(options);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        const result = await StaysNetService.importReservations(config, options);
        dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });
        throw error;
      }
    },
    []
  );

  /**
   * Import guests
   */
  const importGuests = useCallback(async (config: StaysNetConfig) => {
    staysnetLogger.import.info('Iniciando importação de hóspedes...');
    dispatch({ type: 'START_IMPORT', payload: 'guests' });

    try {
      const result = await StaysNetService.importGuests(config);
      dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  /**
   * Import all (full sync)
   */
  const importAll = useCallback(
    async (config: StaysNetConfig, options: ImportOptions) => {
      staysnetLogger.import.info('Iniciando importação completa...');
      dispatch({ type: 'START_IMPORT', payload: 'all' });

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

        const result = await StaysNetService.importAll(config, options);
        dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });
        throw error;
      }
    },
    []
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
      } catch (error) {
        console.error('');
        console.error('❌ ERRO NA IMPORTAÇÃO DE TESTE:');
        console.error(error);
        console.error('');
        
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [state.availableProperties]
  );

  return {
    ...state,
    fetchProperties,
    importProperties,
    importReservations,
    importGuests,
    importAll,
    importOneForTest,
    toggleProperty,
    selectAllProperties,
    deselectAllProperties,
    resetImport,
  };
}
