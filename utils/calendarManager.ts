/**
 * CALENDAR MANAGER - AGENDA VIVA RENDIZY
 * 
 * Sistema que mantém automaticamente uma agenda sempre com 5 anos à frente.
 * Quando o horizonte fica menor que 5 anos, novos dias são adicionados automaticamente.
 * 
 * @author RENDIZY Team
 * @version 1.0.0
 * @date 2025-10-28
 */

const FIVE_YEARS_IN_DAYS = 1825; // 5 anos * 365 dias
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Verifica a cada 1 hora

export interface CalendarDay {
  date: string; // YYYY-MM-DD format
  isActive: boolean;
  createdAt: string;
}

/**
 * Calcula quantos dias existem entre duas datas
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / oneDay);
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formata data para YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica se a agenda precisa ser estendida
 * Retorna a quantidade de dias que precisam ser adicionados
 */
export function checkCalendarHorizon(lastDay: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar para meia-noite
  
  const daysRemaining = daysBetween(today, lastDay);
  
  console.log('📅 CALENDAR MANAGER - Verificação de Horizonte:');
  console.log(`   → Hoje: ${formatDate(today)}`);
  console.log(`   → Último dia da agenda: ${formatDate(lastDay)}`);
  console.log(`   → Dias restantes: ${daysRemaining}`);
  console.log(`   → Meta: ${FIVE_YEARS_IN_DAYS} dias (5 anos)`);
  
  if (daysRemaining < FIVE_YEARS_IN_DAYS) {
    const daysToAdd = FIVE_YEARS_IN_DAYS - daysRemaining;
    console.log(`   ✅ Precisa adicionar ${daysToAdd} dias`);
    return daysToAdd;
  }
  
  console.log('   ✅ Agenda OK - não precisa adicionar dias');
  return 0;
}

/**
 * Gera array de datas para adicionar à agenda
 */
export function generateNewDays(startDate: Date, numberOfDays: number): CalendarDay[] {
  const newDays: CalendarDay[] = [];
  const now = new Date().toISOString();
  
  for (let i = 1; i <= numberOfDays; i++) {
    const newDate = addDays(startDate, i);
    newDays.push({
      date: formatDate(newDate),
      isActive: true,
      createdAt: now
    });
  }
  
  return newDays;
}

/**
 * Calcula qual deveria ser o último dia da agenda baseado em hoje
 */
export function getTargetLastDay(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return addDays(today, FIVE_YEARS_IN_DAYS);
}

/**
 * Verifica se está no horário de execução (próximo à meia-noite)
 * Retorna true se estiver entre 00:00 e 00:59
 */
export function isMidnightWindow(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour === 0; // Entre 00:00 e 00:59
}

/**
 * Calcula o tempo até a próxima meia-noite em millisegundos
 */
export function timeUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Logger formatado para Calendar Manager
 */
export function logCalendarEvent(event: string, data?: any) {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log(`\n🗓️  [CALENDAR MANAGER] ${timestamp}`);
  console.log(`   ${event}`);
  if (data) {
    console.log('   Dados:', data);
  }
  console.log('');
}

/**
 * Classe principal do Calendar Manager
 */
export class CalendarManager {
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheckDate: string = '';
  private onExtend: ((days: CalendarDay[]) => Promise<void>) | null = null;

  constructor() {
    logCalendarEvent('🚀 Calendar Manager inicializado');
  }

  /**
   * Define callback para quando novos dias forem adicionados
   */
  setOnExtend(callback: (days: CalendarDay[]) => Promise<void>) {
    this.onExtend = callback;
  }

  /**
   * Verifica e estende a agenda se necessário
   */
  async checkAndExtend(currentLastDay: Date): Promise<boolean> {
    const today = formatDate(new Date());
    
    // Evita múltiplas verificações no mesmo dia
    if (this.lastCheckDate === today) {
      return false;
    }

    this.lastCheckDate = today;
    
    const daysToAdd = checkCalendarHorizon(currentLastDay);
    
    if (daysToAdd > 0 && this.onExtend) {
      const newDays = generateNewDays(currentLastDay, daysToAdd);
      
      logCalendarEvent(
        `📈 Estendendo agenda: ${daysToAdd} novos dias`,
        {
          primeiroNovoDia: newDays[0]?.date,
          ultimoNovoDia: newDays[newDays.length - 1]?.date,
          totalDias: newDays.length
        }
      );
      
      try {
        await this.onExtend(newDays);
        logCalendarEvent('✅ Agenda estendida com sucesso!');
        return true;
      } catch (error) {
        logCalendarEvent('❌ Erro ao estender agenda', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Inicia monitoramento automático
   */
  startMonitoring(getCurrentLastDay: () => Date) {
    logCalendarEvent('🔄 Monitoramento automático iniciado');
    
    // Verificação inicial
    const currentLastDay = getCurrentLastDay();
    this.checkAndExtend(currentLastDay);
    
    // Verificação periódica (a cada hora)
    this.intervalId = setInterval(() => {
      const lastDay = getCurrentLastDay();
      this.checkAndExtend(lastDay);
    }, CHECK_INTERVAL_MS);
    
    // Agendar verificação especial à meia-noite
    this.scheduleMidnightCheck(getCurrentLastDay);
  }

  /**
   * Agenda verificação para meia-noite
   */
  private scheduleMidnightCheck(getCurrentLastDay: () => Date) {
    const msUntilMidnight = timeUntilMidnight();
    
    setTimeout(() => {
      logCalendarEvent('🌙 Verificação de meia-noite executada');
      const lastDay = getCurrentLastDay();
      this.checkAndExtend(lastDay);
      
      // Reagendar para a próxima meia-noite (24h)
      this.scheduleMidnightCheck(getCurrentLastDay);
    }, msUntilMidnight);
    
    const hoursUntil = Math.floor(msUntilMidnight / (1000 * 60 * 60));
    const minutesUntil = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`   ⏰ Próxima verificação de meia-noite em: ${hoursUntil}h ${minutesUntil}min`);
  }

  /**
   * Para o monitoramento
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logCalendarEvent('⏹️  Monitoramento automático parado');
    }
  }

  /**
   * Retorna estatísticas da agenda
   */
  getStats(currentLastDay: Date): {
    lastDay: string;
    daysRemaining: number;
    yearsRemaining: number;
    isHealthy: boolean;
    targetDays: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysRemaining = daysBetween(today, currentLastDay);
    const yearsRemaining = Math.floor(daysRemaining / 365);
    
    return {
      lastDay: formatDate(currentLastDay),
      daysRemaining,
      yearsRemaining,
      isHealthy: daysRemaining >= FIVE_YEARS_IN_DAYS,
      targetDays: FIVE_YEARS_IN_DAYS
    };
  }
}

// Singleton instance
let calendarManagerInstance: CalendarManager | null = null;

/**
 * Obtém instância singleton do Calendar Manager
 */
export function getCalendarManager(): CalendarManager {
  if (!calendarManagerInstance) {
    calendarManagerInstance = new CalendarManager();
  }
  return calendarManagerInstance;
}

/**
 * Cria dias iniciais da agenda (primeira inicialização)
 */
export function createInitialCalendar(): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days: CalendarDay[] = [];
  const now = new Date().toISOString();
  
  // Criar 5 anos de dias a partir de hoje
  for (let i = 0; i <= FIVE_YEARS_IN_DAYS; i++) {
    const date = addDays(today, i);
    days.push({
      date: formatDate(date),
      isActive: true,
      createdAt: now
    });
  }
  
  logCalendarEvent(
    '🎉 Calendário inicial criado',
    {
      primeiroDia: days[0].date,
      ultimoDia: days[days.length - 1].date,
      totalDias: days.length,
      anosCobertura: 5
    }
  );
  
  return days;
}
