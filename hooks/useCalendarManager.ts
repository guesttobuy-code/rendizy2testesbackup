/**
 * HOOK: useCalendarManager
 * 
 * Hook React para integrar o Calendar Manager no sistema RENDIZY.
 * Gerencia automaticamente a agenda viva de 5 anos.
 * 
 * @author RENDIZY Team
 * @version 1.0.0
 * @date 2025-10-28
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getCalendarManager, CalendarDay, logCalendarEvent } from '../utils/calendarManager';

interface UseCalendarManagerOptions {
  /**
   * Função para obter o último dia atual da agenda
   */
  getCurrentLastDay: () => Date;
  
  /**
   * Callback quando novos dias forem adicionados
   */
  onDaysAdded?: (days: CalendarDay[]) => Promise<void>;
  
  /**
   * Habilitar/desabilitar o monitoramento automático
   */
  enabled?: boolean;
}

interface CalendarManagerStats {
  lastDay: string;
  daysRemaining: number;
  yearsRemaining: number;
  isHealthy: boolean;
  targetDays: number;
}

/**
 * Hook para gerenciar a agenda viva do sistema
 */
export function useCalendarManager(options: UseCalendarManagerOptions) {
  const { getCurrentLastDay, onDaysAdded, enabled = true } = options;
  const managerRef = useRef(getCalendarManager());
  const [stats, setStats] = useState<CalendarManagerStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Usar refs para evitar dependências no useEffect
  const getCurrentLastDayRef = useRef(getCurrentLastDay);
  const onDaysAddedRef = useRef(onDaysAdded);
  
  // Atualizar refs quando props mudam
  useEffect(() => {
    getCurrentLastDayRef.current = getCurrentLastDay;
  }, [getCurrentLastDay]);
  
  useEffect(() => {
    onDaysAddedRef.current = onDaysAdded;
  }, [onDaysAdded]);

  // Atualizar estatísticas (memoizado)
  const updateStats = useCallback(() => {
    try {
      const lastDay = getCurrentLastDayRef.current();
      const newStats = managerRef.current.getStats(lastDay);
      setStats(newStats);
    } catch (error) {
      console.error('❌ Erro ao atualizar stats do calendar manager:', error);
    }
  }, []);

  // Verificação manual (memoizado)
  const checkAndExtend = useCallback(async () => {
    try {
      const lastDay = getCurrentLastDayRef.current();
      const extended = await managerRef.current.checkAndExtend(lastDay);
      updateStats();
      return extended;
    } catch (error) {
      console.error('❌ Erro ao verificar/estender calendário:', error);
      return false;
    }
  }, [updateStats]);

  // Inicialização (executa apenas uma vez)
  useEffect(() => {
    if (!enabled) return;

    logCalendarEvent('🎯 Hook useCalendarManager montado');

    // Configurar callback de extensão
    const wrappedCallback = async (days: CalendarDay[]) => {
      if (onDaysAddedRef.current) {
        await onDaysAddedRef.current(days);
      }
      updateStats();
    };
    
    managerRef.current.setOnExtend(wrappedCallback);

    // Iniciar monitoramento
    managerRef.current.startMonitoring(() => getCurrentLastDayRef.current());
    setIsMonitoring(true);

    // Atualizar stats inicial
    updateStats();

    // Atualizar stats periodicamente (a cada 5 minutos)
    const statsInterval = setInterval(updateStats, 5 * 60 * 1000);

    // Cleanup
    return () => {
      managerRef.current.stopMonitoring();
      setIsMonitoring(false);
      clearInterval(statsInterval);
      logCalendarEvent('🛑 Hook useCalendarManager desmontado');
    };
  }, [enabled, updateStats]); // Apenas 'enabled' e 'updateStats' nas dependências

  return {
    stats,
    isMonitoring,
    checkAndExtend,
    updateStats,
    manager: managerRef.current
  };
}
