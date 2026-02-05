/**
 * 🏗️ REAL ESTATE MODULE - Módulo Modular Completo
 * 
 * Arquitetura modular com cápsulas separadas para:
 * - Construtoras
 * - Imobiliárias
 * - Empreendimentos
 * - Corretores
 * - Unidades
 * 
 * Esta estrutura facilita manutenção e permite reutilização
 */

// ============================================
// Types - Definições de tipos compartilhados
// ============================================
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
} from './types';

// ============================================
// Hooks - Gerenciamento de estado e dados
// ============================================
export {
  useConstrutoras,
  useImobiliarias,
  useEmpreendimentos,
  useUnidades,
  useCorretores,
  useRealEstateStats,
} from './hooks';

// ============================================
// Components - Componentes visuais modulares
// ============================================
export {
  ConstrutoraCard,
  ImobiliariaCard,
  EmpreendimentoCard,
  CorretorCard,
} from './components';
