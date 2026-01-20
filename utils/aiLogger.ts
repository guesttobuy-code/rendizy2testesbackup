/**
 * 🤖 AI Logger Bridge - Captura logs do navegador para análise
 * 
 * Uso:
 * 1. Importar no App.tsx
 * 2. Logs são salvos no localStorage
 * 3. Copiar os logs e colar no chat para análise
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  stack?: string;
  data?: any;
}

class AILogger {
  private static instance: AILogger;
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private storageKey = 'rendizy_ai_logs';

  private constructor() {
    this.interceptConsole();
    this.interceptErrors();
    this.loadLogs();
  }

  static getInstance(): AILogger {
    if (!AILogger.instance) {
      AILogger.instance = new AILogger();
    }
    return AILogger.instance;
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      this.addLog('log', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.addLog('error', args);
      originalError.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.addLog('info', args);
      originalInfo.apply(console, args);
    };
  }

  private interceptErrors() {
    window.addEventListener('error', (event) => {
      this.addLog('error', [event.message], event.error?.stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
    });
  }

  private addLog(level: LogEntry['level'], args: any[], stack?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      stack,
    };

    this.logs.push(entry);

    // Manter apenas os últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.saveLogs();
  }

  private saveLogs() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {
      // localStorage cheio - limpar logs antigos
      this.logs = this.logs.slice(-50);
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    }
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      this.logs = [];
    }
  }

  /**
   * 📋 Copiar logs formatados para colar no chat da IA
   */
  copyLogsForAI() {
    const formatted = this.logs
      .slice(-20) // Últimos 20 logs
      .map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('pt-BR');
        const icon = {
          log: '📝',
          warn: '⚠️',
          error: '❌',
          info: 'ℹ️'
        }[log.level];
        
        let output = `${icon} [${time}] ${log.message}`;
        if (log.stack) {
          output += `\n   Stack: ${log.stack}`;
        }
        return output;
      })
      .join('\n\n');

    const finalText = `
🤖 LOGS DO NAVEGADOR PARA ANÁLISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formatted}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de logs capturados: ${this.logs.length}
    `.trim();

    navigator.clipboard.writeText(finalText);
    console.info('✅ Logs copiados! Cole no chat da IA');
    return finalText;
  }

  /**
   * 🗑️ Limpar todos os logs
   */
  clear() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
    console.info('🗑️ Logs limpos');
  }

  /**
   * 📊 Ver estatísticas dos logs
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warn').length,
      logs: this.logs.filter(l => l.level === 'log').length,
      info: this.logs.filter(l => l.level === 'info').length,
    };
    console.table(stats);
    return stats;
  }
}

// Exportar instância global
export const aiLogger = AILogger.getInstance();

// Adicionar comandos globais ao window para fácil acesso no console
declare global {
  interface Window {
    aiLogger: {
      copy: () => string;
      clear: () => void;
      stats: () => any;
    };
  }
}

window.aiLogger = {
  copy: () => aiLogger.copyLogsForAI(),
  clear: () => aiLogger.clear(),
  stats: () => aiLogger.getStats(),
};

console.info(`
🤖 AI Logger ativado!

Comandos disponíveis no console:
  aiLogger.copy()  - Copiar logs para IA
  aiLogger.clear() - Limpar logs
  aiLogger.stats() - Ver estatísticas
`);
