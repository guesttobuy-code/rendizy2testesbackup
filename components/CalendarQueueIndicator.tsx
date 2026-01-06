// CalendarQueueIndicator.tsx
// ============================================================================
// COMPONENTE: Indicador Visual de Queue do Calendário
// ============================================================================
//
// CRIADO: 2026-01-06 (commit 178ce7d)
// RELACIONADO: hooks/useCalendarPricingRules.ts (V2.1)
//
// ESTADOS VISUAIS:
// - 🟢 Verde (Check): Operações salvas com sucesso (2s de feedback)
// - 🟡 Âmbar (Clock): Operações pendentes aguardando debounce
// - 🔵 Azul (Spinner): Processando/enviando ao servidor
// - 🔴 Vermelho (Alert): Erro ao salvar (com botão retry)
//
// USO NO CALENDÁRIO:
// ```tsx
// import { CalendarQueueIndicator } from './CalendarQueueIndicator';
// 
// <CalendarQueueIndicator 
//   status={queueStatus}           // do useCalendarPricingRules
//   onForceFlush={flushQueue}      // força envio imediato
//   className="fixed bottom-4 right-4 z-50"
// />
// ```
//
// ============================================================================

import React from 'react';
import { Loader2, Check, AlertCircle, Clock } from 'lucide-react';

interface QueueStatus {
  pending: number;
  processing: boolean;
  lastFlush: number | null;
  errors: string[];
}

interface CalendarQueueIndicatorProps {
  status: QueueStatus;
  onForceFlush?: () => void;
  className?: string;
}

export function CalendarQueueIndicator({ status, onForceFlush, className = '' }: CalendarQueueIndicatorProps) {
  const { pending, processing, lastFlush, errors } = status;
  
  // Se não há nada pendente e não está processando, não mostrar
  if (pending === 0 && !processing && errors.length === 0) {
    // Mostrar feedback de sucesso por 2 segundos após flush
    if (lastFlush && Date.now() - lastFlush < 2000) {
      return (
        <div className={`flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm ${className}`}>
          <Check className="w-4 h-4" />
          <span>Salvo</span>
        </div>
      );
    }
    return null;
  }
  
  // Mostrar erros
  if (errors.length > 0) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Erro ao salvar ({errors.length})</span>
        {onForceFlush && (
          <button 
            onClick={onForceFlush}
            className="ml-1 underline hover:no-underline"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }
  
  // Processando
  if (processing) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Salvando...</span>
      </div>
    );
  }
  
  // Pendente (aguardando debounce)
  if (pending > 0) {
    return (
      <div 
        className={`flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm cursor-pointer hover:bg-amber-100 transition-colors ${className}`}
        onClick={onForceFlush}
        title="Clique para salvar agora"
      >
        <Clock className="w-4 h-4" />
        <span>{pending} alteração{pending > 1 ? 'ões' : ''} pendente{pending > 1 ? 's' : ''}</span>
      </div>
    );
  }
  
  return null;
}

export default CalendarQueueIndicator;
