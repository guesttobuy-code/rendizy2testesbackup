/**
 * 🏗️ Real Estate Hooks - Barrel Export
 * 
 * Exporta todos os hooks do módulo Real Estate
 */

export { useConstrutoras } from './useConstrutoras';
export { useImobiliarias } from './useImobiliarias';
export { useEmpreendimentos } from './useEmpreendimentos';
export { useUnidades } from './useUnidades';
export { useCorretores } from './useCorretores';
export { useRealEstateStats } from './useRealEstateStats';

// Re-export types for convenience
export type {
  Construtora,
  Imobiliaria,
  Empreendimento,
  Unidade,
  Corretor,
  RealEstateStats,
  FiltroConstrutora,
  FiltroImobiliaria,
  FiltroEmpreendimento,
  FiltroUnidade,
  FiltroCorretor,
} from '../types';
